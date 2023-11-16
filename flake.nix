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
                nvsBase = (pkgs.callPackage
                    (pkgs.import ./default.nix)
                    {
                        pkgs = pkgs;
                        deno = pkgs.deno;
                        bash = pkgs.bash;
                    }
                );
                nvs = nvsBase.overrideAttrs {
                    src = self;
                };
            in
                {
                    packages = {
                        nvs = nvs;
                        default = nvs;
                    };
                }
        );
}
