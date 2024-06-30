{
    description = "A CLI tool (nvs) for finding old versions of nix packages!";

    inputs = {
        nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
        flakeUtils.url = "github:numtide/flake-utils";
    };

    outputs = { self, nixpkgs, flakeUtils }:
        flakeUtils.lib.eachDefaultSystem (system:
            let
                pkgs = nixpkgs.legacyPackages.${system};
                nvs = (pkgs.callPackage
                    (builtins.import ./default.nix)
                    {
                        inherit system;
                        _pkgs = pkgs;
                    }
                );
            in
                {
                    packages = {
                        nvs = nvs;
                        default = nvs;
                    };
                }
        );
}
