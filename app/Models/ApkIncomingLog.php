<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApkIncomingLog extends Model
{
    protected $table = 'apk_incoming_logs';
    public $timestamps = false;

    protected $fillable = [
        'id', 'method', 'endpoint', 'headers', 'body', 'ip', 'created_at'
    ];
}
