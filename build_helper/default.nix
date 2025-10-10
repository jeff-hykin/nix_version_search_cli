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
                url="https://github.com/NixOS/nixpkgs/archive/REPLACEME_NIXPKGS_HASH_9409841.tar.gz";
                sha256="REPLACEME_NIXPKGS_SHA256_9409841";
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
    escapeShellArg ? _pkgs.lib.escapeShellArg,
}:
    let
        gotDeno2 = (builtins.compareVersions "2" deno.version) == -1;
        denoEscaped = escapeShellArg (if gotDeno2 then _pkgs.deno else deno);
        unzipEscaped = escapeShellArg unzip;
        coreutilsEscaped = escapeShellArg coreutils;
    in 
        _core.derivation {
            system = system;
            name = "nvs";
            version = "1.5.0";
            builder = "${bash}/bin/bash";
            src = _src;
            args = [
                "-c"
                ''
                    export PATH="$PATH:"${denoEscaped}"/bin/:"${unzipEscaped}"/bin:"${coreutilsEscaped}"/bin"
                    mkdir -p "$out/source/"
                    mkdir -p "$out/bin"
                    mkdir -p "$out/tmp"
                    # copy over source code
                    cp "$src/main.bundle.js" "$out/source/main.bundle.js"
                    
                    # setup for isolating deno
                    export HOME="$src/home"
                    export TMP="$out/tmp"
                    export DENO_DIR="$out/tmp"
                    export DENO_NO_UPDATE_CHECK="true"
                    export DENO_INSTALL_ROOT="$out/bin/"
                    export DENO_NO_PACKAGE_JSON="true"
                    
                    # compile as a means of caching any dependencies
                    # note1: there shouldn't be any (its bundled)
                    # note2: deno has better ways to cache, but this works across deno 1.x and 2.x
                    ${denoEscaped}/bin/deno compile --no-lock --allow-all --output "$out/tmp" "$src/main.bundle.js" &> "$out/err.log"
                    
                    # create the helper executer for deno
                    echo ${escapeShellArg ''#!/bin/sh
                        TMP="''${VAR:="/tmp"}" \
                        DENO_DIR="$out/tmp" \
                        DENO_NO_UPDATE_CHECK="true" \
                        DENO_INSTALL_ROOT="$out/bin/" \
                        DENO_NO_PACKAGE_JSON="true" \
                        exec ${escapeShellArg denoEscaped}/bin/deno run --no-lock --no-check --cached-only -Aq -- ''}"$out"'/source/main.bundle.js "$@"' > "$out/bin/nvs"
                    # note: $out is not being properly escaped above, but we know that it is safe (will never contain $'s or other weird characters)
                    
                    chmod +x "$out/bin/nvs"
                    
                    # cleanup
                    rm -rf "$out/tmp"
                    rm -rf "$out/home"
                    rm -rf "$out/err.log"
                ''
            ];
        }