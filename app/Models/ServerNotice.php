<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServerNotice extends Model
{
    protected $table = 'server_notices';
    public $timestamps = false;

    protected $fillable = [
        'id', 'title', 'content', 'is_active', 'reward_gold', 'created_at', 'updated_at'
    ];

    public function claims()
    {
        return $this->hasMany(NoticeClaim::class, 'notice_id');
    }
}

