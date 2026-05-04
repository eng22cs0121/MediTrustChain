export interface DrugMaster {
  id: string;
  drug_name: string;
  generic_name?: string;
  drug_code: string;
  composition: string;
  strength: string;
  dosage_form: string;
  approved_expiry_months: number;
  approved_manufacturer_ids: string[];
  composition_hash: string;
  blockchain_tx_hash?: string;
  blockchain_block?: number;
  approved_by?: string;
  approved_by_org?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
