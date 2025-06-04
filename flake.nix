{
  description = "Metabase development environment";

  inputs = {
  nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
  flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
  flake-utils.lib.eachDefaultSystem (system:
    let
    pkgs = nixpkgs.legacyPackages.${system};
    in
    {
    devShells.default = pkgs.mkShell {
      nativeBuildInputs = with pkgs.buildPackages; [
        # Node.js and package managers
        nodejs_22  # Matches package.json requirement ">=22"
        yarn

        # Java and Clojure
        jdk11
        clojure

        # Database
        (postgresql.withPackages (p: [ p.postgis ]))

        # Build tools and utilities
        git-credential-manager
        python3  # Required for native module compilation
        gcc      # C compiler for native modules
        gnumake  # Make for building native dependencies
        pkg-config  # For finding libraries during compilation

        # Additional tools that may be needed
        which
        curl
        unzip
      ];

      # Note: installPhrase appears to be commented out in original
      # installPhase = ''
      #   # Find path to java.security in jdk11
      #   JAVA_SECURITY_PATH=$(dirname $(dirname $(readlink -f $(which java))))/conf/security/java.security
      #   echo $JAVA_SECURITY_PATH
      #
      #   # Modify java.security file (example: enabling unlimited cryptography policy)
      #   sed -i 's/^jdk.tls.disabledAlgorithms=SSLv3, TLSv1, TLSv1.1,/jdk.tls.disabledAlgorithms=/' "$JAVA_SECURITY_PATH"
      # '';

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
      ./bin/build-driver.sh sqlserver
      yarn dev
      '';
    };
    });
}
