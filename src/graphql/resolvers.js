import defineUserModel from '../models/user.js';
import { produceMessage } from '../../common/shared/utils/producer.kafka.js';
import {getInfluxDBV2} from '../../common/startup/db.influx.v2.js';
import pkg from 'mercurius';
const { withFilter } = pkg;

let User;

const initializeModels = async () => {
    User = defineUserModel();
    return { User };
};

const resolvers = {
    Query: {
        users: async (_, __, { user }) => {
            if (!user) {
                throw new Error('Not authenticated');
            }
            try {
                const users = await User.findAll();
                return users;
            } catch (error) {
                throw new Error('Failed to fetch users: ' + error.message);
            }
        },
        user: async (_, { id }, { user }) => {
            if (!user) {
                throw new Error('Not authenticated');
            }
            try {
                const userRecord = await User.findByPk(id);
                if (!userRecord) {
                    throw new Error('User not found');
                }
                return userRecord;
            } catch (error) {
                throw new Error('Failed to fetch user: ' + error.message);
            }
        },
        events: async (_, { userId, eventType, deviceType, elementId, page, startTime, endTime, limit = 10, offset = 0 }) => {
            try {
                const influx = await getInfluxDBV2();
                const queryApi = influx.getQueryApi(process.env.INFLUXDB_ORG);
                
                const query = `
                    from(bucket: "${process.env.INFLUXDB_BUCKET}")
                        |> range(start: ${startTime || '-1h'}, stop: ${endTime || 'now()'})
                        |> filter(fn: (r) => r._measurement == "events"
                            ${userId ? `and r.userId == "${userId}"` : ''}
                            ${eventType ? `and r.eventType == "${eventType}"` : ''}
                            ${deviceType ? `and r.deviceType == "${deviceType}"` : ''}
                            ${elementId ? `and r.elementId == "${elementId}"` : ''}
                            ${page ? `and r.page == "${page}"` : ''}
                        )
                        |> sort(columns: ["_time"])
                        |> limit(n: ${limit}, offset: ${offset})
                `;

                const countQuery = `
                    from(bucket: "${process.env.INFLUXDB_BUCKET}")
                        |> range(start: ${startTime || '-1h'}, stop: ${endTime || 'now()'})
                        |> filter(fn: (r) => r._measurement == "events"
                            ${userId ? `and r.userId == "${userId}"` : ''}
                            ${eventType ? `and r.eventType == "${eventType}"` : ''}
                            ${deviceType ? `and r.deviceType == "${deviceType}"` : ''}
                            ${elementId ? `and r.elementId == "${elementId}"` : ''}
                            ${page ? `and r.page == "${page}"` : ''}
                        )
                        |> count()
                `;

                let totalCount = 0;
                await queryApi.queryRows(countQuery, {
                    next(row, tableMeta) {
                        const o = tableMeta.toObject(row);
                        totalCount = o._value;
                    },
                    error(error) {
                        console.error('Count query error:', error);
                        reject(new Error(`Failed to fetch events: ${error.message}`));
                    },
                    complete() {
                        console.log('Count query complete');
                    },
                });
                
                const edges = [];
                
                return new Promise((resolve, reject) => {
                    queryApi.queryRows(query, {
                        next(row, tableMeta) {
                            const o = tableMeta.toObject(row);
                            edges.push({
                                cursor: o._time,
                                node: {
                                    eventType: o.eventType,
                                    deviceType: o.deviceType,
                                    elementId: o.elementId,
                                    page: o.page,
                                    userId: o.userId,
                                    value: o._value,
                                    timestamp: o._time,
                                }
                            });
                        },
                        error(error) {
                            console.error('Query error:', error);
                            reject(new Error(`Failed to fetch events: ${error.message}`));
                        },
                        complete() {
                            console.log('Query complete');
                            resolve({
                                __typename: "EventConnection",
                                edges,
                                pageInfo: {
                                    hasNextPage: offset + limit < totalCount,
                                    hasPreviousPage: offset > 0,
                                    startCursor: edges.length > 0 ? edges[0].cursor : null,
                                    endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
                                },
                            });
                        },
                    });
                });
            } catch (error) {
                return {
                    __typename: "Error",
                    message: `Failed to fetch events: ${error.message}`,
                    code: 500,
                };;
            }
        },
        getEventDistribution: async (_, { userId, eventType, deviceType, elementId, page, startTime, endTime, groupBy}) => {
            const influx = await getInfluxDBV2();
            const queryApi = influx.getQueryApi(process.env.INFLUXDB_ORG);

            const validGroupByFields = ["deviceType", "eventType", "userId", "elementId", "page"];
            const groupColumn = validGroupByFields.includes(groupBy) ? `"${groupBy}"` : '"deviceType"';

            const query = `
                from(bucket: "${process.env.INFLUXDB_BUCKET}")
                    |> range(start: ${startTime || '-1h'}, stop: ${endTime || 'now()'})
                    |> filter(fn: (r) => r._measurement == "events"
                        ${userId ? `and r.userId == "${userId}"` : ''}
                        ${eventType ? `and r.eventType == "${eventType}"` : ''}
                        ${deviceType ? `and r.deviceType == "${deviceType}"` : ''}
                        ${elementId ? `and r.elementId == "${elementId}"` : ''}
                        ${page ? `and r.page == "${page}"` : ''}
                    )
                    |> group(columns: [${groupColumn}])
                    |> count()
            `;

            const distribution = [];
            return new Promise((resolve, reject) => {
                queryApi.queryRows(query, {
                    next(row, tableMeta) {
                        const o = tableMeta.toObject(row);
                        distribution.push({key: o[groupBy || 'deviceType'], count: o._value });
                    },
                    error(error) {
                        console.error('Query error:', error);
                        reject(new Error(`Failed to fetch events: ${error.message}`));
                        },
                    complete() {
                        console.log('Query complete');
                        resolve(distribution);
                    },
                });
            });
        },
        aggregateEvents: async (_, { userId, eventType, deviceType, elementId, page, startTime, endTime, groupBy, aggregationFunction, every}) => {
            const influx = await getInfluxDBV2();
            const queryApi = influx.getQueryApi(process.env.INFLUXDB_ORG);
        
            const validGroupByFields = ["deviceType", "eventType", "userId", "elementId", "page"];
            const groupColumn = validGroupByFields.includes(groupBy) ? `"${groupBy}"` : '"eventType"';

            let aggregationQuery;
            if (aggregationFunction === 'unique') {
                aggregationQuery = `
                    |> aggregateWindow(every: 5m, fn: (tables=<-,column="userId") => tables |> unique(column: "userId"), createEmpty: false)
                `;
            } else {
                aggregationQuery = `
                    |> aggregateWindow(every: ${every}, fn: ${aggregationFunction}, createEmpty: false)
                `;
            }

            const query = `
                from(bucket: "${process.env.INFLUXDB_BUCKET}")
                    |> range(start: ${startTime || '-1h'}, stop: ${endTime || 'now()'})
                    |> filter(fn: (r) => r._measurement == "events"
                        ${userId ? `and r.userId == "${userId}"` : ''}
                        ${eventType ? `and r.eventType == "${eventType}"` : ''}
                        ${deviceType ? `and r.deviceType == "${deviceType}"` : ''}
                        ${elementId ? `and r.elementId == "${elementId}"` : ''}
                        ${page ? `and r.page == "${page}"` : ''}
                    )
                    |> group(columns: [${groupColumn}])
                    ${aggregationQuery}
            `;
            const distribution = [];
            return new Promise((resolve, reject) => {
                queryApi.queryRows(query, {
                    next(row, tableMeta) {
                        const o = tableMeta.toObject(row);
                        distribution.push({key: o[groupBy] || o.eventType, count: o._value, timestamp: o._time });
                    },
                    error(error) {
                        console.error('Query error:', error);
                        reject(new Error(`Failed to fetch events: ${error.message}`));
                    },
                    complete() {
                        console.log('Query complete');
                        resolve(distribution);
                    },
                });
            });
        },
        averageSessionDuration: async (_, { userId, startTime, endTime }) => {
            const influx = await getInfluxDBV2();
            const queryApi = influx.getQueryApi(process.env.INFLUXDB_ORG);
        
            const query = `
                // Query for login events
                data1 = from(bucket: "${process.env.INFLUXDB_BUCKET}")
                    |> range(start: ${startTime || '-1h'}, stop: ${endTime || 'now()'})
                    |> filter(fn: (r) => r._measurement == "events" and r.eventType == "login"
                        ${userId ? `and r.userId == "${userId}"` : ''})
                    |> keep(columns: ["_time", "userId", "sessionId"])

                // Query for logout events
                data2 = from(bucket: "${process.env.INFLUXDB_BUCKET}")
                    |> range(start: ${startTime || '-1h'}, stop: ${endTime || 'now()'})
                    |> filter(fn: (r) => r._measurement == "events" and r.eventType == "logout"
                        ${userId ? `and r.userId == "${userId}"` : ''})
                    |> keep(columns: ["_time", "userId", "sessionId"])

                // Join the two datasets
                join(
                    tables: {login: data1, logout: data2},
                    on: ["userId"],
                    method: "inner"
                )
                |> map(fn: (r) => ({
                    userId: r.userId,
                    loginTime: r._time_login,
                    logoutTime: r._time_logout
                }))
            `;

            const sessionData = [];
            return new Promise((resolve, reject) => {
                queryApi.queryRows(query, {
                    next(row, tableMeta) {
                        const o = tableMeta.toObject(row);
                        const duration = (new Date(o.logoutTime).getTime() - new Date(o.loginTime).getTime())/1000;
                        sessionData.push({
                            userId: o.userId,
                            duration
                        });
                    },
                    error(error) {
                        console.error('Query error:', error);
                        reject(new Error(`Failed to fetch average session duration: ${error.message}`));
                    },
                    complete() {
                        console.log('Query complete');
                        resolve(sessionData);
                    },
                });
            });
        },        
    },
    Subscription: {
        eventAdded: {
            subscribe: withFilter(
                async (root, args, { pubsub }) => await pubsub.subscribe('EVENT_ADDED'),
                (payload, { userId, eventType, deviceType, elementId, page, startTime, endTime }) => {
                    const event = payload.eventAdded;
                    if (!event) {
                        return false; 
                    }
    
                    const timestampDate = new Date(event.timestamp);
                    const isUserMatch = !userId || event.userId === userId;
                    const isEventTypeMatch = !eventType || event.eventType === eventType;
                    const isDeviceTypeMatch = !deviceType || event.deviceType === deviceType;
                    const isElementIdMatch = !elementId || event.elementId === elementId;
                    const isPageMatch = !page || event.page === page;
                    const isStartTimeMatch = !startTime || timestampDate >= new Date(startTime);
                    const isEndTimeMatch = !endTime || timestampDate <= new Date(endTime);
    
                    return isUserMatch && isEventTypeMatch && isDeviceTypeMatch && isElementIdMatch && isPageMatch && isStartTimeMatch && isEndTimeMatch;
                }
            ),
            },
    },
    Mutation: {
        createUser: async (_, { username, email, password, role }, { bcrypt }) => {
            try {
                const hashedPassword = await bcrypt.hash(password);
                const newUser = await User.create({ username, email, password: hashedPassword, role });
                return newUser;
            } catch (error) {
                throw new Error('Failed to create user: ' + error.message);
            }
        },
        login: async (_, { username, password }, { bcrypt, request, pubsub }) => {

            const user = await User.findOne({ where: { username } });
            if (!user) {
                throw new Error('Invalid credentials');
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                throw new Error('Invalid credentials');
            }

            request.logIn(user, (err) => {
                if (err) {
                    throw new Error('Failed to create session');
                }
            });

            const sessionId = request.session.sessionId;
            await produceMessage({ eventType: 'login', deviceType: request.headers['user-agent'], elementId: 'button-0', page: request.originalUrl, userId: user.id, sessionId, value: 1.0, timestamp: new Date().toISOString()});
            await pubsub.publish({
                topic: 'EVENT_ADDED',
                payload: {
                    eventAdded: { eventType: 'login', deviceType: request.headers['user-agent'], elementId: 'button-0', page: request.originalUrl, userId: user.id, sessionId, value: 1.0, timestamp: new Date().toISOString()}
                }
            })

            return {user}
        },

        logout: async (_, __, { request, pubsub }) => {
            if (!request.user) {
                return false; 
            }
            const userId = request.user.dataValues.id;
            const sessionId = request.session.sessionId;

            request.logout((err) => {
                if (err) {
                    throw new Error('Failed to create session');
                }
            });

            await produceMessage({ eventType: 'logout', deviceType: request.headers['user-agent'], elementId: 'button-1', page: request.originalUrl, userId, sessionId, value: 1.0, timestamp: new Date().toISOString()});
            await pubsub.publish({
                topic: 'EVENT_ADDED',
                payload: {
                    eventAdded: { eventType: 'logout', deviceType: request.headers['user-agent'], elementId: 'button-1', page: request.originalUrl, userId, sessionId, value: 1.0, timestamp: new Date().toISOString()}
                }
            })

            return true;
        },

        updateUser: async (_, { id, username, email, password, role }, { bcrypt, user }) => {
            if (!user) {
                throw new Error('Not authenticated');
            }
            try {
                const userRecord = await User.findByPk(id);
                if (!userRecord) {
                    throw new Error('User not found');
                }

                if (username) userRecord.username = username;
                if (email) userRecord.email = email;
                if (password) {
                    userRecord.password = await bcrypt.hash(password);
                }
                if (role) userRecord.role = role;

                await userRecord.save();
                return userRecord;
            } catch (error) {
                throw new Error('Failed to update user: ' + error.message);
            }
        },
        deleteUser: async (_, { id }, { user }) => {
            if (!user) {
                throw new Error('Not authenticated');
            }
            try {
                const userRecord = await User.findByPk(id);
                if (!userRecord) {
                    throw new Error('User not found');
                }

                await userRecord.destroy();
                return true;
            } catch (error) {
                throw new Error('Failed to delete user: ' + error.message);
            }
        },
        produceEvent: async (_, { input }, { request, user, pubsub }) => {
            if (!user) {
                throw new Error('Not authenticated');
            }
            
            const sessionId = request.session.sessionId;

            if (!input) {
                throw new Error('Input is required');
            }
        
            const { eventType, deviceType, elementId, page, userId, value, timestamp } = input;
        
            await produceMessage({
                eventType,
                deviceType,
                elementId,
                page,
                userId: userId || user.id,
                sessionId,
                value,
                timestamp
            });

            await pubsub.publish({
                topic: 'EVENT_ADDED',
                payload: {
                    eventAdded: { eventType, deviceType, elementId, page, userId: userId || user.id, sessionId, value, timestamp }
                }
            })

            return `${eventType} Event produced for UserId ${userId}`;
        },
    },
};

export { resolvers, initializeModels };
