insert into subjects (name, is_default)
values
  ('Português', true),
  ('Raciocínio Lógico', true),
  ('Direito Constitucional', true),
  ('Administração Pública', true),
  ('Informática', true),
  ('Matemática', true),
  ('Cálculo I', true),
  ('Física I', true),
  ('Química Geral', true),
  ('Algoritmos', true),
  ('Economia', true),
  ('Estatística', true)
on conflict do nothing;

insert into templates (name, cadence_days, is_default)
values
  ('Essencial', '{1,7,15,30}', true),
  ('Intensivo', '{1,3,7,14,21}', true),
  ('Longo prazo', '{2,10,30,60,120}', true)
on conflict do nothing;
