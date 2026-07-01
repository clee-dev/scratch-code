#!/bin/bash

current_date=$(date)
echo $current_date

uptime=$(uptime)
echo $uptime

mem_usage=$(free -h | awk ' /Mem:/ {print $2, $3}')
echo -e $mem_usage
