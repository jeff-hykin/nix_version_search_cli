{
    # local install command:
    #     nix-env -i -f ./  
    # or
    #     nix profile install ./flake.nix
    _core ? builtins,
    _pkgs ? (_core.import 
        (_core.fetchTarball
            ({url="https://github.com/NixOS/nixpkgs/archive/6d9c572be2b199be0456845a61d7e4b3e3ac6280.tar.gz";})
        )
        ({
            overlays = [ 
            ]; 
        })
    ),
    _src ? _core.fetchTarball ({
        url="https://github.com/jeff-hykin/nix_version_search_cli/archive/REPLACEME_420492093.tar.gz";
    }),
    system ? _core.currentSystem,
    deno ? _pkgs.deno,
    bash ? _pkgs.bash,
}:
    _core.derivation {
        system = system;
        name = "nvs";
        version = "1.0.0";
        builder = "${bash}/bin/bash";
        src = _src;
        args = [
            "-c"
            ''
                export PATH="$PATH:${deno}/bin/:${_pkgs.coreutils}/bin"
                # 
                # commands
                # 
                export HOME="$out/bin/home"
                mkdir -p "$out/bin"
                "${deno}/bin/deno" compile --allow-all --output "$out/bin/nvs" "$src/build_helper/main.bundle.js"
                "$out/bin/nvs" --help > "$out/bin/help.txt"
            ''
        ];
    }