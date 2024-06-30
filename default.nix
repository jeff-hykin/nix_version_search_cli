
#
#
# DONT EDIT ME; EDIT ./build_helper/default.nix
#
#

{
    # local install command:
    #     nix-env -i -f ./  
    # or
    #     nix profile install ./
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
    _src ? ./.,
    system ? _core.currentSystem,
    deno ? _pkgs.deno,
    bash ? _pkgs.bash,
    coreutils ? _pkgs.coreutils,
    unzip ? _pkgs.unzip,
}:
    _core.derivation {
        system = system;
        name = "nvs";
        version = "1.4.8";
        builder = "${bash}/bin/bash";
        src = _src;
        args = [
            "-c"
            ''
                export PATH="$PATH:${deno}/bin/:${unzip}/bin:${coreutils}/bin"
                # 
                # commands
                # 
                
                export HOME="$out/bin/home"
                mkdir -p "$out/bin"
                DENO_DIR=.deno deno install --root "$out" --name nvs --allow-all "$src/build_helper/main.bundle.js"
                rm -rf "$HOME"
            ''
        ];
    }