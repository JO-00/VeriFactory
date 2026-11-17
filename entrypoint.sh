#!/bin/bash


cp .env.example .env

cp vite_frontend/src/.env.example vite_frontend/src/.env

cp vite_frontend/.env.example vite_frontend/.env

docker compose up --build