<?php

namespace App\Providers;

use App\Models\ServerNotice;
use App\Models\NoticeClaim;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Schema;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Paginator::useTailwind();

        try {
            if (Schema::hasTable('server_notices')) {
                View::composer(['layouts.player', 'layouts.admin'], function ($view) {
                    $activeNotice = ServerNotice::where('is_active', 1)->latest('id')->first();
                    $hasClaimedGlobalNotice = false;

                    if ($activeNotice && $activeNotice->reward_gold > 0 && Auth::check()) {
                        $hasClaimedGlobalNotice = NoticeClaim::where('notice_id', $activeNotice->id)
                            ->where('user_id', Auth::id())
                            ->exists();
                    }

                    $view->with('globalNotice', $activeNotice)
                         ->with('hasClaimedGlobalNotice', $hasClaimedGlobalNotice);
                });
            }
        } catch (\Throwable $e) {
            // Graceful fallback during setup or cli operations
        }
    }
}
