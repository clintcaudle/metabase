{ pkgs ? import <nixpkgs> {} }:
  pkgs.mkShell {
  # nativeBuildInputs is usually what you want -- tools you need to run
    nativeBuildInputs = with pkgs.buildPackages; [
      yarn
      jdk11
      clojure
      git-credential-manager
      postgresql
    ];

    shellHook = ''
              export MB_DB_TYPE=postgres
              export MB_DB_DBNAME=metabase
              export MB_DB_PORT=5432
              export MB_DB_USER=clintcaudle
              export MB_DB_PASS=testtest
              export MB_DB_HOST=localhost
              # java -jar metabase.jar
    '';
}
