{
  description = "A CLI tool(s) for finding old versions of nix packages!";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages = rec {
          nvs = with pkgs; (
            callPackage (import ./build_helper/default.nix) {
              inherit pkgs deno bash;
            }).overrideAttrs { src = self; };
          default = nvs;
        };
      }
    );
}
