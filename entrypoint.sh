#!/bin/bash


cp .env.example .env

cp vite_frontend/src/.env.example vite_frontend/src/.env

docker compose up --build