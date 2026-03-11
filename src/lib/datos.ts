// src/lib/datos.ts

export const USUARIOS = [
  // ADMIN - Matrícula 9999
  { matricula: "9999", nome: "Central de Operações", cargo: "ADMIN" },
  
  // EQUIPE DE CAMPO - Matrícula 1001
  { 
    matricula: "1001", 
    nome: "Nathan (Líder)", 
    cargo: "EQUIPE", 
    equipeId: "eqp-1" 
  },
  // EQUIPE DE CAMPO - Matrícula 1002
  { 
    matricula: "1002", 
    nome: "Carlos (Líder)", 
    cargo: "EQUIPE", 
    equipeId: "eqp-2" 
  },
  // EQUIPE DE CAMPO - Matrícula 1003
  { 
    matricula: "1003", 
    nome: "Marcos (Líder)", 
    cargo: "EQUIPE", 
    equipeId: "eqp-3" 
  }
];

export const EQUIPES = [
  {
    id: "eqp-1",
    nome: "Equipe Alpha (Zona Sul)",
    carro: "Fiat Strada - Placa OEX-9090",
    equipamentos: "Kit Alta Tensão, Escada 7m, Drone Térmico",
    status: "Disponível",
    members: 4,
    location: "Zona Sul"
  },
  {
    id: "eqp-2",
    nome: "Equipe Beta (Zona Norte)",
    carro: "Ford Ranger - Placa ABC-1234",
    equipamentos: "Kit Baixa Tensão, Escada 5m",
    status: "Ocupada",
    members: 3,
    location: "Zona Norte"
  },
  {
    id: "eqp-3",
    nome: "Equipe Gamma (Centro)",
    carro: "Chevrolet S10 - Placa XYZ-5678",
    equipamentos: "Kit Média Tensão, Equipamentos Industriais",
    status: "Disponível",
    members: 5,
    location: "Centro"
  }
];

export const OCORRENCIAS = [
  {
    id: "OC-500",
    titulo: "Reparo Elétrico - Av. Paulista",
    endereco: "Av. Paulista, 1000",
    prioridade: "Alta",
    status: "PENDENTE",
    equipeId: "eqp-1",
    lat: -23.561684,
    lng: -46.655981
  }
];
