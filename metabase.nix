{ pkgs ? import <nixpkgs> {} }:
  pkgs.mkShell {
  # nativeBuildInputs is usually what you want -- tools you need to run
    nativeBuildInputs = with pkgs.buildPackages; [
      yarn
      jdk11
      clojure
      git-credential-manager
      ( postgresql.withPackages (p: [ p.postgis ]) )
    ];

    # buildPhase = ''
    installPhrase = ''
    # # Find path to java.security in jdk11
    # JAVA_SECURITY_PATH=$(dirname $(dirname $(readlink -f $(which java))))/conf/security/java.security
    # echo $JAVA_SECURITY_PATH

    # # Modify java.security file (example: enabling unlimited cryptography policy)
    # sed -i 's/^jdk.tls.disabledAlgorithms=SSLv3, TLSv1, TLSv1.1,/jdk.tls.disabledAlgorithms=/' "$JAVA_SECURITY_PATH"
    '';

    shellHook = ''
              # export JAVA_TOOL_OPTIONS="-Djdk.tls.disabledAlgorithms=SSLv3 -Djdk.tls.client.protocols=TLSv1"
              export PG=$PWD/.dev_postgres/
              export PGDATA=$PG/data
              export PGPORT=5432
              export PGHOST=localhost
              export PGUSER=$USER
              export PGPASSWORD=postgres
              export PGDATABASE=metabase
              export DB_URL=postgres://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE
              alias pg_start="pg_ctl -D $PGDATA -l $PG/postgres.log start"
              alias pg_stop="pg_ctl -D $PGDATA stop"
              pg_setup() {
                pg_stop;
                rm -rf $PG;
                initdb -D $PGDATA &&
                echo "unix_socket_directories = '$PGDATA'" >> $PGDATA/postgresql.conf &&
                pg_start &&
                createdb
              }
              '';
  }
