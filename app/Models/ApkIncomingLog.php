<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApkIncomingLog extends Model
{
    protected $table = 'apk_incoming_logs';
    public $timestamps = false;

    protected $fillable = [
        'id', 'method', 'endpoint', 'headers', 'body', 'payload', 'ip', 'ip_address', 'created_at'
    ];

    public function getIpAttribute($value)
    {
        return $value ?? ($this->attributes['ip_address'] ?? null);
    }

    public function getBodyAttribute($value)
    {
        return $value ?? ($this->attributes['payload'] ?? null);
    }
}
