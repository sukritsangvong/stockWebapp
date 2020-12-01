#!/bin/sh

sh get_company_data.sh | awk -F '	' '{print $1}'
