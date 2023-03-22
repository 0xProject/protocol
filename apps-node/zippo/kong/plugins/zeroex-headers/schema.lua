return {
  name = "zeroex-headers",
  fields = {
    { config = {
        type = "record",
        fields = {
          { integrator_id = { type = "string" }, },
          { app_id = { type = "string" }, },
          { tier = { type = "string" }, },
          { integrator_properties = { type = "string" }, },
          { app_properties = { type = "string" }, },
        },
    }, },
  }
}