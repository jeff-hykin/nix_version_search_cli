#!/usr/bin/env sh
"\"",`$(echo --% ' |out-null)" >$null;function :{};function dv{<#${/*'>/dev/null )` 2>/dev/null;dv() { #>
echo "1.42.1"; : --% ' |out-null <#'; }; version="$(dv)"; deno="$HOME/.deno/$version/bin/deno"; if [ -x "$deno" ]; then  exec "$deno" run -q -A --no-lock "$0" "$@";  elif [ -f "$deno" ]; then  chmod +x "$deno" && exec "$deno" run -q -A --no-lock "$0" "$@";  fi; bin_dir="$HOME/.deno/$version/bin"; exe="$bin_dir/deno"; has () { command -v "$1" >/dev/null; } ;  if ! has unzip; then if ! has apt-get; then  has brew && brew install unzip; else  if [ "$(whoami)" = "root" ]; then  apt-get install unzip -y; elif has sudo; then  echo "Can I install unzip for you? (its required for this command to work) ";read ANSWER;echo;  if [ "$ANSWER" = "y" ] || [ "$ANSWER" = "yes" ] || [ "$ANSWER" = "Y" ]; then  sudo apt-get install unzip -y; fi; elif has doas; then  echo "Can I install unzip for you? (its required for this command to work) ";read ANSWER;echo;  if [ "$ANSWER" = "y" ] || [ "$ANSWER" = "yes" ] || [ "$ANSWER" = "Y" ]; then  doas apt-get install unzip -y; fi; fi;  fi;  fi;  if ! has unzip; then  echo ""; echo "So I couldn't find an 'unzip' command"; echo "And I tried to auto install it, but it seems that failed"; echo "(This script needs unzip and either curl or wget)"; echo "Please install the unzip command manually then re-run this script"; exit 1;  fi;  repo="denoland/deno"; if [ "$OS" = "Windows_NT" ]; then target="x86_64-pc-windows-msvc"; else :;  case $(uname -sm) in "Darwin x86_64") target="x86_64-apple-darwin" ;; "Darwin arm64") target="aarch64-apple-darwin" ;; "Linux aarch64") repo="LukeChannings/deno-arm64" target="linux-arm64" ;; "Linux armhf") echo "deno sadly doesn't support 32-bit ARM. Please check your hardware and possibly install a 64-bit operating system." exit 1 ;; *) target="x86_64-unknown-linux-gnu" ;; esac; fi; deno_uri="https://github.com/$repo/releases/download/v$version/deno-$target.zip"; exe="$bin_dir/deno"; if [ ! -d "$bin_dir" ]; then mkdir -p "$bin_dir"; fi;  if ! curl --fail --location --progress-bar --output "$exe.zip" "$deno_uri"; then if ! wget --output-document="$exe.zip" "$deno_uri"; then echo "Howdy! I looked for the 'curl' and for 'wget' commands but I didn't see either of them. Please install one of them, otherwise I have no way to install the missing deno version needed to run this code"; exit 1; fi; fi; unzip -d "$bin_dir" -o "$exe.zip"; chmod +x "$exe"; rm "$exe.zip"; exec "$deno" run -q -A --no-lock "$0" "$@"; #>}; $DenoInstall = "${HOME}/.deno/$(dv)"; $BinDir = "$DenoInstall/bin"; $DenoExe = "$BinDir/deno.exe"; if (-not(Test-Path -Path "$DenoExe" -PathType Leaf)) { $DenoZip = "$BinDir/deno.zip"; $DenoUri = "https://github.com/denoland/deno/releases/download/v$(dv)/deno-x86_64-pc-windows-msvc.zip";  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;  if (!(Test-Path $BinDir)) { New-Item $BinDir -ItemType Directory | Out-Null; };  Function Test-CommandExists { Param ($command); $oldPreference = $ErrorActionPreference; $ErrorActionPreference = "stop"; try {if(Get-Command "$command"){RETURN $true}} Catch {Write-Host "$command does not exist"; RETURN $false}; Finally {$ErrorActionPreference=$oldPreference}; };  if (Test-CommandExists curl) { curl -Lo $DenoZip $DenoUri; } else { curl.exe -Lo $DenoZip $DenoUri; };  if (Test-CommandExists curl) { tar xf $DenoZip -C $BinDir; } else { tar -Lo $DenoZip $DenoUri; };  Remove-Item $DenoZip;  $User = [EnvironmentVariableTarget]::User; $Path = [Environment]::GetEnvironmentVariable('Path', $User); if (!(";$Path;".ToLower() -like "*;$BinDir;*".ToLower())) { [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDir", $User); $Env:Path += ";$BinDir"; } }; & "$DenoExe" run -q -A --no-lock "$PSCommandPath" @args; Exit $LastExitCode; <# 
# */0}`;

import { agressiveRemove } from "https://esm.sh/gh/jeff-hykin/deno_nix_api@0961ac6/main.js"

await agressiveRemove(Deno.args[0])

// const packageInfo = JSON.parse({
//     "elements": [
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/8xzlyndbxcvazdsbg0iadq0xbw55rvyn-python3.10-hydra-check-1.3.5"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/gjpn24490s7isxi5k1j0qfl3xk06lb48-tree-2.1.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/6xz3p1g46b8maslmqbws7dz0mb9xl9rn-nano-7.2"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/3j13fydymk9xpw0k8rihxhicqj4v22c2-zsh-5.9"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/2kiyqzz2rd2q0nial9jbb8mi0ybpcxss-git-subrepo-0.4.5"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/zxcacldqm83vcidj2hkq3bvxl5b5sj3x-dua-2.20.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/95l2z80kcbrvlbsvbs964y9iwl36zg4r-exa-0.10.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/fx5l0wlkmfpbflw3jja0pjs8dcji5rih-ungit-1.5.24"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/38wf8xjlv4bn7245445xs4fxs6rlvnvf-cachix-1.6.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/ayh7g27mz9r8dhr3jzk9j7qxbl6rkghk-npm-10.1.0"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/vgmnbka10hs7rm9k8jw7gkx7ls8hsjq8-esbuild-0.19.5"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/qwvf64hkj1bldkm3cdl3anda0j7dka8j-python3.11-black-23.9.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/24ajznyylhxh7gcbhc2a6ccfn9wlz8xx-tealdeer-1.6.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/211vjr5mv6bgcwwvhq5jc4lr8nwywiq5-wakapi-2.8.2"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/qyby4f90rmax54dx9dd0hd1b1gxk9sdn-fd-8.7.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/gl6iw4wyczib1m266fdx87lpsj9w3xj1-coreutils-9.0"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 4,
//             "storePaths": [
//                 "/nix/store/ayh7g27mz9r8dhr3jzk9j7qxbl6rkghk-npm-10.1.0"
//             ]
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.1.0.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.1.0.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "legacyPackages.aarch64-darwin.deno",
//             "originalUrl": "https://github.com/NixOS/nixpkgs/archive/6d9c572be2b199be0456845a61d7e4b3e3ac6280.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/l940dh07v9ns1h666d3hrb4am75yhym3-deno-1.37.2"
//             ],
//             "url": "https://github.com/NixOS/nixpkgs/archive/6d9c572be2b199be0456845a61d7e4b3e3ac6280.tar.gz?narHash=sha256-URLqkHhlS/zH7lMr50nc4Eb06leBa3r48ZloxQTd96A%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "legacyPackages.aarch64-darwin.xplr",
//             "originalUrl": "https://github.com/NixOS/nixpkgs/archive/6d9c572be2b199be0456845a61d7e4b3e3ac6280.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/p114qjgxrc59qpg8c5lwyv846nxg78y5-xplr-0.21.3"
//             ],
//             "url": "https://github.com/NixOS/nixpkgs/archive/6d9c572be2b199be0456845a61d7e4b3e3ac6280.tar.gz?narHash=sha256-URLqkHhlS/zH7lMr50nc4Eb06leBa3r48ZloxQTd96A%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "legacyPackages.aarch64-darwin.bottom",
//             "originalUrl": "path:/nix/store/1dklh99pdzxcxmrxz3i63rb3pa832yik-source",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/xkmrqzyvdypm1k5yp5vzmhq3kaq955ya-bottom-0.9.6"
//             ],
//             "url": "path:/nix/store/1dklh99pdzxcxmrxz3i63rb3pa832yik-source?lastModified=0&narHash=sha256-kEmpezCR/FpITc6yMbAh4WrOCiT2zg5pSjnKrq51h5Y%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "legacyPackages.aarch64-darwin.ripgrep",
//             "originalUrl": "path:/nix/store/dp1dqbqn1a95976yzrpc1ph6880kwr2g-source",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/qgjyy47yz3klh9y7psj721xxciadv57w-ripgrep-14.0.3"
//             ],
//             "url": "path:/nix/store/dp1dqbqn1a95976yzrpc1ph6880kwr2g-source?lastModified=0&narHash=sha256-7LK019%2BY9khM18WjIt4ISK2yd1P5z%2BCXJq0ts%2BE13UA%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "legacyPackages.aarch64-darwin.sd",
//             "originalUrl": "path:/nix/store/7g8wbm1z6948x0qma4hzkkb9a3xys76w-source",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/29xrgg1hdx9f6yyyd3b8b7501al6z1k0-sd-1.0.0"
//             ],
//             "url": "path:/nix/store/7g8wbm1z6948x0qma4hzkkb9a3xys76w-source?lastModified=0&narHash=sha256-ugr1QyzzwNk505ICE4VMQzonHQ9QS5W33xF2FXzFQ00%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.nvs",
//             "originalUrl": "https://github.com/jeff-hykin/nix_version_search_cli/archive/8a57c4bed8a90bed03c57575b7d81d969c886664.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/swsav18chnc2lf6b66lwn0hwhhl44ka1-nvs"
//             ],
//             "url": "https://github.com/jeff-hykin/nix_version_search_cli/archive/8a57c4bed8a90bed03c57575b7d81d969c886664.tar.gz?narHash=sha256-0CJA2cTaTWo4SwR1WyltI63imwFLAEsd50DTz6vJdsk%3D"
//         }
//     ],
//     "version": 2
// })
// (this comment is part of deno-guillotine, dont remove) #>