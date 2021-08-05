window.addEventListener("load", function(event) {
setTimeout(function(){
document.querySelector('#loading').style.display = 'none';
document.querySelector('#body').style.display = 'block';
}, 1700);

const vueapp = Vue.createApp({
    data() {
        return {
            file: null,
            SelectDateAndPass: false,
            DaysToExpire: "0",
            PasswordOfFile: "",
            Description: "",
            Title: "",
            PeriodsOfValidity: [1, 7, 15, 30],
            Uploading: false
        };
    },
    methods: {
        dragover: function (e) { // When the user drags over the file on the uploading box.
            e.currentTarget.classList.add("AddColorBackground");
        },
        dragleave: function (e) {
            e.currentTarget.classList.remove("AddColorBackground");
        },
        FileUploaded: function (e) {
            // When the user presses ''Select file''and selects a file.
            this.file = e.target.files[0];
            this.SelectDateAndPass = true;
        },
        dropfile: function (e) {
            // When the user drops the file on the uploading box.
            this.file = e.dataTransfer.files[0];
            e.currentTarget.classList.remove("AddColorBackground");
            this.SelectDateAndPass = true;
        },
        uploadFile: function () {
            // When the user presses on button ,,Or Select file'', run this function which active hidden input.
            document.getElementById("fileUpload").click();
        },
        FinishUpload: function (e) {
            e.preventDefault();
            this.Uploading = true;
            // When the user finishes selecting the validity of the file and etc. and he presses on ,,Upload'', send date to server.
            let formData = new FormData();
            formData.append("File", this.file);
            formData.append("Description", this.Description);
            formData.append("Title", this.Title);
            formData.append("Password", this.PasswordOfFile);
            formData.append("PeriodsOfValidity", this.DaysToExpire);
            axios
                .post("/uploadfile", formData)
                .then(
                    function (response) { // Server's responses.
                        if (response.data.uploaded) { // If the file is successful uploaded.
                            setTimeout(function () {
                                swal.close(); // Close ,,File is uploading'' sweet alert.
                                Swal.fire("Nice!", "Your file is successfully uploaded!", "success").then(() => {
                                    window.location = response.data.url;
                                });
                            }, 3000);
                        }
                        if (response.data.Error) { // If there is any error with uploading
                            Swal.fire({
                                title: "Error!",
                                text: response.data.Message,
                                icon: "error",
                                confirmButtonText: "Okay"
                            });
                        }
                    }.bind(this)
                )
                .catch((error) => {
                    console.error(error);
                });
            this.SelectDateAndPass = false;
            Swal.fire({
                title: "Photo is uploading",
                allowOutsideClick: false,
                html: "Your photo will be uploaded soon!",
                timer: this.timer,
                timerProgressBar: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            }).then((result) => {});
        },
        TurnOffUpload: function () { // When the user presses on ,,Close''.
            this.SelectDateAndPass = false;
            this.Description = "";
            this.PasswordOfFile = "";
            this.Title = "";
            this.file = null;
        }
    }
});
vueapp.mount("#app");
});