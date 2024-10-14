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

Architecture
- The architecture of the Real-Time Analytics Dashboard integrates multiple technologies to provide efficient data capture, processing, and visualization. Below is a high-level overview of the architecture:


Components
1. Fastify: Serves as the API layer, handling HTTP requests and providing a GraphQL interface via Mercurius.
2. PostgreSQL: Stores structured user enabling relational queries.
3. InfluxDB: Specialized for storing time-series data, allowing for quick retrieval and analysis of user click events.
4. Kafka: Acts as a message broker, facilitating the streaming of user click events between services.
5. Mercurius: Provides a GraphQL API that enables clients to query event data and receive real-time updates.

Data Flow
- User click events are captured and sent to Kafka.
- Fastify listens for events from Kafka, processes them, and stores the relevant data in both PostgreSQL and InfluxDB.
- Clients can query the data using GraphQL through Mercurius and receive real-time updates when new events are processed.

## Technologies Used

- [Fastify](https://www.fastify.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [InfluxDB](https://www.influxdata.com/)
- [Kafka](https://kafka.apache.org/)
- [Mercurius](https://mercurius.dev/)
