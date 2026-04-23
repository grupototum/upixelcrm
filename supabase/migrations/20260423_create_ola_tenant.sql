-- Cria o tenant "Olá" (subdomínio ola.upixel.app) para demonstrações.
-- Tenant sem owner inicial — usar upixel.app/cadastro para criar o usuário demo.

INSERT INTO public.tenants (name, subdomain, plan, is_active)
VALUES ('Olá Demo', 'ola', 'free', true)
ON CONFLICT (subdomain) DO NOTHING;

SELECT id, name, subdomain, is_active FROM public.tenants WHERE subdomain = 'ola';
