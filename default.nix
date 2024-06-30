
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
        version = "1.4.17";
        builder = "${bash}/bin/bash";
        src = _src;
        args = [
            "-c"
            ''
                export PATH="$PATH:${deno}/bin/:${unzip}/bin:${coreutils}/bin"
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
                
                cp "$src/readme.md" "$out/" &> "$out/cp.log"
                unzip "$out/readme.md" -d "$out/" &> "$out/unzip.log"
                # // you might be wondering why someone would be unpacking a "readme.md"... like it was a zip
                # // buckle up
                    # // yeah, so... nix build (aka flakes, NOT nix-build) was being really wierd on v2.17.0 on linux x86
                    # // in this script, doing `ls -la "$src/" &>log.txt` wouldnt list any NEW files/folders 
                    # // even when I added --no-eval-cache, even when I deleted the flake lock, even when I tried purging old derivations
                    # // I tried a bunch of other things and nothing worked
                    # // renaming a file "default.nix" -> "default2.nix" would cause it to dissapear from ls
                    # // undoing the change would make it appear on the list again
                    # // edits to files did show up. E.g.   `cat s/readme.md` would always, correctly, show the latest contents 
                    # // So maybe this weird behavior not even a caching issue. Idk
                    # // I have no idea what the hell nix is doing, I've spent hours tring to find someone with this issue online and got nothing
                    # //
                    # // So... you might see where this is going
                    # // this is definitely one of the worst hacks I've ever needed to implement,
                    # // but I'm not about to start debugging the internals of nix
                    # //
                    # // I zip all the stuff I need for $src (the home folder cache for deno) into a zip
                    # // and then name that zip "readme.md", so that, for some god forsaken reason, it will show up in this `nix build` script
                    # // then I unpack it
                    # // so now I have to use readme_workaround.md because "readme.md" is actually a zip file
                
                export TMP="$out/tmp"
                export HOME="$out/home"
                export DENO_NO_UPDATE_CHECK="true"
                "${deno}/bin/deno" compile --no-lock --allow-all --quiet --output "$out/bin/nvs" "$src/main.bundle.js" &> "$out/err.log"
                rm -rf "$HOME"
                rm -rf "$TMP"
                rm -f "$out/readme.md"
                rm -f "$out/cp.log"
                rm -f "$out/unzip.log"
                rm -f "$out/err.log"
            ''
        ];
    }