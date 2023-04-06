return {
  name = "zeroex-headers",
  fields = {
    { config = {
        type = "record",
        fields = {
          { team_id = { type = "string" }, },
          { app_id = { type = "string" }, },
          { tier = { type = "string" }, },
          { app_properties = { type = "string" }, },
          { affiliate_address = { type = "string" }, },
          { legacy_integrator_id = { type = "string" }, },
        },
    }, },
  }
}