'use strict';

(function () {
    const PROFILE_KEY = 'lapis_user_profile';
    const EMPTY_PROFILE = { nickname: '', birthday: '', birthdayTs: 0 };

    function _storage() {
        if (typeof LapisStorage === 'undefined') throw new Error('LapisStorage is required.');
        return LapisStorage;
    }

    function _normalizeBirthday(value) {
        const birthday = String(value || '').trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(birthday) ? birthday : '';
    }

    function normalize(profile) {
        return {
            nickname: String(profile?.nickname || '').trim().substring(0, 80),
            birthday: _normalizeBirthday(profile?.birthday),
            birthdayTs: Number(profile?.birthdayTs) || 0,
        };
    }

    const LapisUserProfile = {
        key: PROFILE_KEY,

        get() {
            return normalize(_storage().get(PROFILE_KEY, EMPTY_PROFILE));
        },

        save(profile) {
            const clean = normalize(profile);
            _storage().set(PROFILE_KEY, clean);
            return clean;
        },

        birthdayMatches(dateStr, birthday) {
            const cleanBirthday = _normalizeBirthday(birthday);
            return !!dateStr && !!cleanBirthday && String(dateStr).slice(5, 10) === cleanBirthday.slice(5, 10);
        }
    };

    if (typeof window !== 'undefined') {
        window.LapisUserProfile = LapisUserProfile;
    }
})();
