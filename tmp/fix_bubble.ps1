$file = "c:\Users\Pichau\Documents\upixelcrm\src\pages\InboxPage.tsx"
$content = Get-Content $file
$newContent = @()

for ($i = 0; $i -lt $content.Count; $i++) {
    if ($i -eq 492) {
        $newContent += "                                    const videoUrl = msg.content;"
        $newContent += "                                    const isWhatsAppDomain = videoUrl?.includes('mmg.whatsapp.net') || videoUrl?.includes('media.whatsapp.net');"
        $newContent += "                                    const hasValidUrl = videoUrl && !videoUrl.startsWith('[') && !videoUrl.includes('.enc') && !isWhatsAppDomain;"
        $i++ # Skip original 493
    } elseif ($i -eq 496) {
        $newContent += "                                        {hasValidUrl ? ("
        $newContent += "                                          <video "
        $newContent += "                                            src={videoUrl} "
        $newContent += "                                            preload='metadata' "
        $newContent += "                                            muted "
        $newContent += "                                            playsInline "
        $newContent += "                                            className='max-w-full h-auto max-h-64 rounded-lg bg-black' "
        $newContent += "                                            onLoadedMetadata={(e) => {"
        $newContent += "                                              const v = e.target as HTMLVideoElement;"
        $newContent += "                                              if (v.duration > 0) {"
        $newContent += "                                                v.currentTime = Math.min(1, v.duration * 0.1);"
        $newContent += "                                              }"
        $newContent += "                                            }}"
        $newContent += "                                            onError={() => {"
        $newContent += "                                              console.error('Video thumbnail error');"
        $newContent += "                                            }}"
        $newContent += "                                          />"
        $newContent += "                                        ) : ("
        $i += 4 # Skip original 497-500
    } else {
        $newContent += $content[$i]
    }
}

$newContent | Set-Content $file -Encoding UTF8
