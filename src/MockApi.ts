// src/services/mockApi.ts
export const getHorariosDisponibles = async (fecha: string) => {
  // Simulamos un retraso de red
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Retornamos horarios de 1 hora
  return ["08:00", "09:00", "10:00", "11:00", "15:00", "16:00", "17:00", "18:00"];
};

export const getHorariosDisponibles2 = async (fecha: string) => {
  // Simulamos un retraso de red
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Retornamos horarios de 1 hora
  return ["08:30", "09:30", "11:30"];
};