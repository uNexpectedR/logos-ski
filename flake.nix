{
  description = "Logos Ski — a downhill run.";

  nixConfig = {
    extra-substituters = [ "https://cache.nix.logos.co/public" ];
    extra-trusted-public-keys = [ "public:l4HrXgL4nw246+LBh2SOJyhz64BoGegOYLheT/iIAPU=" ];
  };

  inputs = {
    logos-module-builder.url = "github:logos-co/logos-module-builder";
    delivery_module = {
      url = "github:logos-co/logos-delivery-module/v0.3.3";
      inputs.logos-module-builder.follows = "logos-module-builder";
    };
    storage_module = {
      url = "github:logos-co/logos-storage-module/v3.0.2";
      inputs.logos-module-builder.follows = "logos-module-builder";
    };
    # Same pin delivery v0.3.3 uses for logos.test. The host does not load
    # this optional module unless the package declares it.
    liblogos_rln_module = {
      url = "git+https://github.com/logos-co/logos-rln-modules?ref=main&rev=a814e7feda974a16eaa5dd50667b8fd843177f0e&dir=logos-rln-module";
      inputs.logos-module-builder.follows = "logos-module-builder";
      inputs.liblogos_lez_rln_module.url = "git+https://github.com/logos-co/logos-rln-modules?ref=main&rev=a814e7feda974a16eaa5dd50667b8fd843177f0e&dir=logos-lez-rln-module";
      inputs.liblogos_lez_rln_module.inputs.logos-module-builder.follows = "logos-module-builder";
    };
  };

  outputs = inputs@{ logos-module-builder, ... }:
    logos-module-builder.lib.mkLogosQmlModule {
      src = ./.;
      configFile = ./metadata.json;
      flakeInputs = inputs;
    };
}
