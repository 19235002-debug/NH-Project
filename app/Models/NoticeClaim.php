<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NoticeClaim extends Model
{
    protected $table = 'notice_claims';
    public $timestamps = false;

    protected $fillable = [
        'notice_id',
        'user_id',
        'claimed_gold',
        'created_at'
    ];

    public function notice()
    {
        return $this->belongsTo(ServerNotice::class, 'notice_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
