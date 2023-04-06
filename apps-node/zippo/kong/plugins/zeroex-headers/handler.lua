local ZeroExHeaders = {}

ZeroExHeaders.PRIORITY = 799
ZeroExHeaders.VERSION = "1.0.1"

function ZeroExHeaders:access(conf)
  if conf.team_id then
    kong.service.request.set_header("0x-Team-Id", conf.team_id)
  end
  if conf.app_id then
    kong.service.request.set_header("0x-App-Id", conf.app_id)
  end
  if conf.tier then
    kong.service.request.set_header("0x-Tier", conf.tier)
  end
  if conf.app_properties then
    kong.service.request.set_header("0x-App-Properties", conf.app_properties)
  end
  if conf.affiliate_address then
    kong.service.request.set_header("0x-Affiliate-Address", conf.affiliate_address)
  end
  if conf.legacy_integrator_id then
    kong.service.request.set_header("0x-Legacy-Integrator-Id", conf.legacy_integrator_id)
  end
end

return ZeroExHeaders