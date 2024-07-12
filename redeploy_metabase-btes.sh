docker stop metabase
docker rm metabase
docker docker image load < ~/metabase/metabase.tar
docker run \
       -d \
       -p 3000:3000 \
       -e "MB_DB_TYPE=postgres" \
       -e "MB_DB_DBNAME=postgres" \
       -e "MB_DB_PORT=5432" \
       -e "MB_DB_USER=postgres" \
       -e "MB_DB_PASS=metameta" \
       -e "MB_DB_HOST=10.150.0.7" \
       --restart unless-stopped \
       --name metabase metabase
