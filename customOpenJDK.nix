{ pkgs ? import <nixpkgs> {} }:
let
  customJDK = pkgs.jdk11.overrideAttrs (oldAttrs: {
	installPhase = ''
	'' + oldAttrs.installPhase;
  });
in
  customJDK