<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\MasterNinja;
use App\Models\PlayerNinja;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function showLogin()
    {
        if (Auth::check()) {
            return Auth::user()->isAdmin() 
                ? redirect()->route('admin.dashboard')
                : redirect()->route('player.dashboard');
        }
        return view('auth.login');
    }

    public function showRegister()
    {
        if (Auth::check()) {
            return redirect()->route('player.dashboard');
        }
        return view('auth.register');
    }

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->username)
            ->orWhere('email', $request->username)
            ->first();

        if (!$user || !password_verify($request->password, $user->password_hash)) {
            if ($request->wantsJson()) {
                return response()->json(['status' => 'error', 'message' => 'Username atau password salah.'], 401);
            }
            return back()->withErrors(['username' => 'Username atau password salah.'])->withInput();
        }

        if ($user->is_banned) {
            $reason = $user->ban_reason ?: 'Melanggar peraturan game.';
            if ($request->wantsJson()) {
                return response()->json(['status' => 'error', 'message' => "Akun Anda di-banned: $reason"], 403);
            }
            return back()->withErrors(['username' => "Akun Anda ditangguhkan: $reason"]);
        }

        Auth::login($user, $request->boolean('remember'));

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Login berhasil.',
                'data' => [
                    'user' => $user,
                    'redirect' => $user->isAdmin() ? route('admin.dashboard') : route('player.dashboard')
                ]
            ]);
        }

        return $user->isAdmin()
            ? redirect()->route('admin.dashboard')->with('success', 'Selamat datang di Game Master Console!')
            : redirect()->route('player.dashboard')->with('success', "Selamat datang kembali, Shinobi {$user->username}!");
    }

    public function register(Request $request)
    {
        $request->validate([
            'username' => 'required|string|min:3|max:30|unique:users,username',
            'password' => 'required|string|min:4|confirmed',
            'email' => 'nullable|email|unique:users,email'
        ]);

        $user = User::create([
            'username' => $request->username,
            'email' => $request->email,
            'password_hash' => password_hash($request->password, PASSWORD_BCRYPT),
            'role' => 'user',
            'level' => 1,
            'exp' => 0,
            'silver' => 50000,
            'gold' => 500,
            'stamina' => 100,
            'vip_level' => 0,
            'avatar_ninja_id' => 17,
            'exam_floor' => 1,
            'gacha_pity' => 0,
            'crane_pity' => 0
        ]);

        // Grant default starter ninja (Naruto ID 17, Grade C)
        $starterNinja = MasterNinja::find(17) ?? MasterNinja::first();
        if ($starterNinja) {
            PlayerNinja::create([
                'user_id' => $user->id,
                'ninja_id' => $starterNinja->id,
                'level' => 1,
                'exp' => 0,
                'is_main' => 1,
                'jutsu_slot_1' => $starterNinja->special_jutsu_id ?? 1092,
                'jutsu_slot_2' => 0,
                'jutsu_slot_3' => 0
            ]);
        }

        Auth::login($user);

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Registrasi berhasil.',
                'data' => ['user' => $user, 'redirect' => route('player.dashboard')]
            ]);
        }

        return redirect()->route('player.dashboard')->with('success', 'Akun Shinobi berhasil dibuat! Selamat bermain.');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->with('info', 'Anda telah keluar.');
    }

    /**
     * Quick role switcher for instant pair-programming/testing
     */
    public function quickLoginAs(string $role)
    {
        if ($role === 'admin') {
            $admin = User::where('role', 'admin')->first();
            if (!$admin) {
                $admin = User::first();
                if ($admin) {
                    $admin->role = 'admin';
                    $admin->save();
                }
            }
            if ($admin) {
                Auth::login($admin);
                return redirect()->route('admin.dashboard')->with('success', 'Beralih ke Akun GM: ' . $admin->username);
            }
        } else {
            $player = User::where('role', '!=', 'admin')->first() ?? User::where('id', '>', 1)->first() ?? User::first();
            if ($player) {
                Auth::login($player);
                return redirect()->route('player.dashboard')->with('success', 'Beralih ke Akun Player: ' . $player->username);
            }
        }

        return redirect()->route('login');
    }
}
