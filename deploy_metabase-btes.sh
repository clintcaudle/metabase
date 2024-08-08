./bin/build-drivers.sh
./bin/build.sh
yarn install
yarn build
docker build -f ~/metabase/Dockerfile ~/metabase/. --tag metabase --build-arg=VERSION=v0.50.19
docker image save metabase > metabase.tar
scp ~/metabase/metabase.tar carina@10.150.0.7:~/metabase/
scp ~/metabase/redeploy_metabase-btes.sh carina@10.150.0.7:~/metabase/
ssh -t carina@10.150.0.7 "sh ~/metabase/redeploy_metabase-btes.sh"
rm metabase.tar
