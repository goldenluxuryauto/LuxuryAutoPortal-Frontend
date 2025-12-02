export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  price: string | number;
  mileage?: number | null;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  engine?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  fuelType?: string | null;
  vin?: string | null;
  status?: string | null;
  featured?: boolean | null;
  description?: string | null;
  images?: string[];
  specifications?: string | null;
}

