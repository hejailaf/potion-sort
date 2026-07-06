Pod::Spec.new do |s|
  s.name           = 'GameCenter'
  s.version        = '1.0.0'
  s.summary        = 'GameKit bindings for Potion Sort'
  s.description    = 'Local Expo module wrapping Game Center authentication, leaderboards, and achievements.'
  s.author         = 'hejailaf'
  s.homepage       = 'https://github.com/hejailaf/potion-sort'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
