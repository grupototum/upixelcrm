-- Upload seguro (itens 5/7 do Clean Up): validação no backend além do frontend.
-- Limites alinhados ao WhatsApp Cloud API (docs até 100MB; imagem/áudio/vídeo bem abaixo).
UPDATE storage.buckets
SET file_size_limit = 104857600, -- 100MB
    allowed_mime_types = ARRAY[
      'image/*', 'audio/*', 'video/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'text/markdown'
    ]
WHERE id = 'whatsapp_media';
