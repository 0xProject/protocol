local ZeroExHeaders = {}

ZeroExHeaders.PRIORITY = 799
ZeroExHeaders.VERSION = "1.0.0"

function ZeroExHeaders:access(conf)
  if conf.integrator_id then
    kong.service.request.set_header("0x-Integrator-Id", conf.integrator_id)
  end
  if conf.app_id then
    kong.service.request.set_header("0x-App-Id", conf.app_id)
  end
  if conf.tier then
    kong.service.request.set_header("0x-Tier", conf.tier)
  end
  if conf.integrator_properties then
      kong.service.request.set_header("0x-Integrator-Properties", conf.integrator_properties)
    end
  if conf.app_properties then
    kong.service.request.set_header("0x-App-Properties", conf.app_properties)
  end
end

return ZeroExHeaders