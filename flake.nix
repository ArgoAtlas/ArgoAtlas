{
  description = "Nix flake for ArgoAtlas";

  inputs = { nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable"; };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      devShells.${system}.default = with pkgs;
        mkShell { buildInputs = [ nodejs ]; };
    };
}
