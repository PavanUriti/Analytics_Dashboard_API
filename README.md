# # Real-Time Analytics Dashboard API

A real-time analytics dashboard built with Fastify, PostgreSQL, InfluxDB, Kafka, and Mercurius. This project showcases how to capture, process, and visualize user click events in real time. It leverages Mercurius for GraphQL, enabling efficient data querying and real-time updates.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technologies Used](#technologies-used)

## Features

- Capture and analyze user click events to gain insights into user interactions
- Real-time event ingestion and processing using Kafka
- Time-series click event data storage in InfluxDB
- User management with PostgreSQL
- Use Mercurius to provide a robust GraphQL API for querying event data
- Fast and efficient API built with Fastify

## Architecture

![Architecture Diagram](path/to/architecture-diagram.png)

1. **Fastify**: Serves as the API layer and handles requests.
2. **PostgreSQL**: Stores structured user data.
3. **InfluxDB**: Stores time-series event data for efficient querying.
4. **Kafka**: Acts as a messaging system for event streaming.
5. **Mercurius**: Provides real-time updates to clients.

## Technologies Used

- [Fastify](https://www.fastify.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [InfluxDB](https://www.influxdata.com/)
- [Kafka](https://kafka.apache.org/)
- [Mercurius](https://mercurius.dev/)
