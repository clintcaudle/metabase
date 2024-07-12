nix-shell metabase.nix
./bin/build-drivers.sh
./bin/build.sh
yarn install
yarn build
docker build -f ~/metabase/Dockerfile ~/metabase/. --tag metabase --build-arg VERSION="0.48.8"
docker image save metabase > metabase.tar
scp ~/metabase/metabase.tar carina@10.150.0.7:~/metabase/
ssh -t carina@10.150.0.7 "sh ~/metabase/redeploy-metabase-btes.sh"
rm metabase.tar
