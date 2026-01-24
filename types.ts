
export interface RefundOrder {
    refund_no: string;
    original_order_no: string;
    amount: number;
    status: 'pending' | 'processing' | 'success' | 'failed' | 'rejected';
    reason: string;
    created_at: string;
    user_id?: string;
    username?: string;
    external_refund_no?: string;
}

export interface RefundBatchResponse {
    total_amount: number;
    refund_orders: RefundOrder[];
}

export interface RechargeResponse {
    order_no: string;
    pay_url?: string;
    qr_code_url?: string;
    message: string;
}
