<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            if ($request->expectsJson()) {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized: Silakan login sebagai Game Master.'], 401);
            }
            return redirect()->route('login')->with('error', 'Akses Game Master diperlukan. Silakan login dengan akun GM.');
        }

        if (!Auth::user()->isAdmin()) {
            if ($request->expectsJson()) {
                return response()->json(['status' => 'error', 'message' => 'Forbidden: Akun Anda tidak memiliki hak Game Master.'], 403);
            }
            return redirect()->route('player.dashboard')->with('error', 'Akses ditolak: Anda tidak memiliki akses ke GM Console.');
        }

        return $next($request);
    }
}
