export interface EmployeeData {
  name: string;
  position: string;
  baseSalary: number;
  yearsOfService: number;
}

export interface CreateEmployeeInput extends EmployeeData {
  finalSalary: number;
}

export interface UpdateEmployeeInput {
  name?: string;
  position?: string;
  baseSalary?: number;
  yearsOfService?: number;
  finalSalary?: number;
}
