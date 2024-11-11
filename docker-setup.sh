#!/bin/bash

docker pull archlinux
docker run -dit --name arch_container archlinux 
docker exec arch_container usermod -a -G wheel -s /bin/bash user
docker exec arch_container pacman -Syu sudo nano
docker exec arch_container sed -i 's/^#%wheel ALL=(ALL) ALL NOPASSWD:ALL/%wheel ALL=(ALL) ALL NOPASSWD:ALL/' /etc/sudoers
