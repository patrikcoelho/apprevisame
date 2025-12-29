insert into subjects (name, study_type, is_default)
values
  ('Português', 'Concurso', true),
  ('Raciocínio Lógico', 'Concurso', true),
  ('Direito Constitucional', 'Concurso', true),
  ('Administração Pública', 'Concurso', true),
  ('Informática', 'Concurso', true),
  ('Matemática', 'Concurso', true),
  ('Cálculo I', 'Faculdade', true),
  ('Física I', 'Faculdade', true),
  ('Química Geral', 'Faculdade', true),
  ('Algoritmos', 'Faculdade', true),
  ('Economia', 'Faculdade', true),
  ('Estatística', 'Faculdade', true)
on conflict do nothing;

insert into templates (name, cadence_days, study_type, is_default)
values
  ('Essencial', '{1,7,15,30}', 'Concurso', true),
  ('Intensivo', '{1,3,7,14,21}', 'Concurso', true),
  ('Longo prazo', '{2,10,30,60,120}', 'Concurso', true),
  ('Essencial', '{1,7,15,30}', 'Faculdade', true),
  ('Intensivo', '{1,3,7,14,21}', 'Faculdade', true),
  ('Longo prazo', '{2,10,30,60,120}', 'Faculdade', true)
on conflict do nothing;
