<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';
    public $timestamps = false;

    protected $fillable = [
        'username',
        'email',
        'role',
        'is_banned',
        'ban_reason',
        'password_hash',
        'level',
        'exp',
        'silver',
        'gold',
        'stamina',
        'vip_level',
        'avatar_ninja_id',
        'last_ramen_claim',
        'exam_floor',
        'map_chapter',
        'map_stage',
        'gacha_pity',
        'crane_pity'
    ];

    protected $hidden = [
        'password_hash',
    ];

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function playerNinjas()
    {
        return $this->hasMany(PlayerNinja::class, 'user_id');
    }

    public function mainNinja()
    {
        return $this->hasOne(PlayerNinja::class, 'user_id')->where('is_main', 1);
    }

    public function deployedNinjas()
    {
        return $this->hasMany(PlayerNinja::class, 'user_id')
            ->whereIn('is_main', [1, 2, 3])
            ->orderBy('is_main', 'asc');
    }

    public function playerJutsus()
    {
        return $this->hasMany(PlayerJutsu::class, 'user_id');
    }
}

