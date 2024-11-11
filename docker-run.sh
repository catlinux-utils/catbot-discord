#!/bin/bash

# Define the container name
CONTAINER_NAME="arch_container"

# Check if the container exists (running or stopped)
if docker ps -a -q -f name=$CONTAINER_NAME; then
    # Check if the container is running
    if docker ps -q -f name=$CONTAINER_NAME; then
        # If running, stop the container
        echo "The container is running. Stopping the container..."
        docker stop $CONTAINER_NAME
    else
        # If stopped, start the container
        echo "The container is stopped. Starting the container..."
        docker start $CONTAINER_NAME
    fi
else
    echo "Container '$CONTAINER_NAME' does not exist."
fi
