#!/bin/bash

# Define the container name
CONTAINER_NAME="arch_container"

# Check if the container is running
container_id=$(docker ps -q -f name=$CONTAINER_NAME)

# If container_id is non-empty, it means the container is running
if [ -n "$container_id" ]; then
    # If running, stop the container
    echo "The container is running. Stopping the container..."
    docker stop $CONTAINER_NAME
else
    # If container_id is empty, check if the container exists (even if stopped)
    container_exists=$(docker ps -a -q -f name=$CONTAINER_NAME)
    
    if [ -n "$container_exists" ]; then
        # If stopped, start the container
        echo "The container is stopped. Starting the container..."
        docker start $CONTAINER_NAME
    else
        echo "Container '$CONTAINER_NAME' does not exist."
    fi
fi
