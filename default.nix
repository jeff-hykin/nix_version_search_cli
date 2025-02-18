
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
    system ? _core.currentSystem,
    _pkgs ? (_core.import 
        (_core.fetchTarball
            ({
                url="https://github.com/NixOS/nixpkgs/archive/ab7b6889ae9d484eed2876868209e33eb262511d.tar.gz";
                sha256="sha256:0wl2rq7jxr7b0g0inxbh9jgiifamn9i45p7fgra8rhhnrmcdlqjz";
            })
        )
        ({
            system = system;
            overlays = [
            ]; 
        })
    ),
    _src ? ./build_helper,
    deno ? _pkgs.deno,
    bash ? _pkgs.bash,
    coreutils ? _pkgs.coreutils,
    unzip ? _pkgs.unzip,
}:
    let
        gotDeno2 = (builtins.compareVersions "2" deno.version) == -1;
        deno_ = (if gotDeno2 then _pkgs.deno else deno);
    in 
        _core.derivation {
            system = system;
            name = "nvs";
            version = "1.4.31";
            builder = "${bash}/bin/bash";
            src = _src;
            args = [
                "-c"
                ''
                    export PATH="$PATH:${deno_}/bin/:${unzip}/bin:${coreutils}/bin"
                    if [[ "$OSTYPE" == "linux-gnu" ]]; then
                        # 
                        # commands
                        # 
                        
                        mkdir -p "$out/bin"
                        mkdir -p "$out/tmp"
                        # ls -la "$src/" &> "$out/log.txt"
                        # cat "$src/default.nix" &> "$out/log1.1.txt"
                        # ls -la "$src/" &> "$out/log1.txt"
                        # ls -la "$src/home" &> "$out/log2.txt"
                        # ls -la "$src/home/.cache/deno" &> "$out/log3.txt"
                        
                        # ls -la $src/main.bundle.js &> "$out/surgon0.txt"
                        export TMP="$out/tmp"
                        export HOME="$src/home"
                        export DENO_NO_UPDATE_CHECK="true"
                        "${deno_}/bin/deno" compile --no-lock --allow-all --output "$out/bin/nvs" "$src/main.bundle.js" &> "$out/err.log"
                        rm -rf "$TMP"
                        rm -f "$out/readme.md"
                        rm -f "$out/cp.log"
                        rm -f "$out/unzip.log"
                        rm -f "$out/err.log"
                    elif [ "$(uname)" = "Darwin" ] 
                    then
                        
                        # 
                        # commands
                        # 
                        
                        export HOME="$out/bin/home"
                        mkdir -p "$out/bin"
                        "${deno_}/bin/deno" compile --allow-all --quiet --output "$out/bin/nvs" "$src/main.bundle.js"
                        rm -rf "$HOME"
                    fi
                    rm -rf "$out/tmp"
                    rm -rf "$out/home"
                    rm -rf "$out/err.log"
                ''
            ];
        }