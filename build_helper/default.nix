{
    # local install command:
    #     nix-env -i -f ./  
    # or
    #     nix profile install ./
    _core ? builtins,
    _pkgs ? (_core.import 
        (_core.fetchTarball
            ({url="https://github.com/NixOS/nixpkgs/archive/REPLACEME_NIXPKGS_HASH_9409841.tar.gz";})
        )
        ({
            overlays = [
            ]; 
        })
    ),
    _src ? ./build_helper,
    system ? _core.currentSystem,
    deno ? _pkgs.deno,
    bash ? _pkgs.bash,
    coreutils ? _pkgs.coreutils,
    unzip ? _pkgs.unzip,
}:
    _core.derivation {
        system = system;
        name = "nvs";
        version = REPLACEME_VERSION_9409841;
        builder = "${bash}/bin/bash";
        src = _src;
        args = [
            "-c"
            ''
                export PATH="$PATH:${deno}/bin/:${unzip}/bin:${coreutils}/bin"
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
                    "${deno}/bin/deno" compile --no-lock --allow-all --output "$out/bin/nvs" "$src/main.bundle.js" &> "$out/err.log"
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
                    "${deno}/bin/deno" compile --allow-all --quiet --output "$out/bin/nvs" "$src/main.bundle.js"
                    rm -rf "$HOME"
                fi
                rm -rf "$out/tmp"
                rm -rf "$out/home"
                rm -rf "$out/err.log"
            ''
        ];
    }